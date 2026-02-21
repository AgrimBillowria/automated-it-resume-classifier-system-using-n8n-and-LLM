import os
import io
import re
from pypdf import PdfReader
import pytesseract
from pdf2image import convert_from_bytes
from PIL import Image

# Supported file extensions
IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.tiff', '.tif', '.bmp', '.webp'}
PDF_EXTENSIONS = {'.pdf'}

def extract_candidate_name(text):
    """
    Heuristic: The candidate name is usually the first non-empty line at the top of a resume.
    """
    section_headers = {'education', 'experience', 'skills', 'summary', 'objective', 'profile', 
                       'contact', 'projects', 'work', 'achievements', 'certifications', 'references',
                       'curriculum vitae', 'resume', 'cv', 'phone', 'address', 'email'}
    
    lines = text.strip().split('\n')
    for line in lines[:10]:  # Check first 10 lines
        line = line.strip()
        if not line or len(line) < 3:
            continue
        if '@' in line or 'http' in line.lower() or 'www.' in line.lower():
            continue
        if re.search(r'\d{5,}', line):  # Skip phone numbers
            continue
        if line.lower().strip(':').strip() in section_headers:
            continue
        words = line.split()
        if 1 <= len(words) <= 5 and not re.search(r'\d', line):
            # Clean up: title case, remove special chars
            name = re.sub(r'[^a-zA-Z\s\.\-]', '', line).strip()
            if len(name) > 2:
                return name.title()
    return None

def parse_resume_text(text):
    """
    Simple heuristic parser to extract features from resume text.
    """
    candidate_name = extract_candidate_name(text)
    text = text.lower()
    
    # 1. Experience
    experience_years = 0.0
    exp_match = re.search(r'(\d+(\.\d+)?)(\+)?\s*(year|yr)', text)
    if exp_match:
        try:
            experience_years = float(exp_match.group(1))
        except ValueError:
            pass
            
    # 2. Education
    education = "Not Specified" 
    degrees = [
        "ph.d", "doctorate", "phd",
        "m.tech", "m.sc", "m.s", "mca", "mba", "master", "post graduate",
        "b.tech", "b.e", "b.sc", "b.s", "bca", "bba", "bachelor", "graduate", "engineer",
        "diploma", "high school", "senior secondary"
    ]
    
    found_degree = False
    for degree in degrees:
        if degree in text:
            for line in text.split('\n'):
                if degree in line:
                    education = line.strip()
                    if len(education) < 100:
                         found_degree = True
                         break
            if found_degree:
                break
    
    if not found_degree and "education" in text:
        try:
            post_education = text.split("education", 1)[1]
            lines = [l.strip() for l in post_education.split('\n') if l.strip()]
            if lines:
                for line in lines[:3]:
                    if len(line) > 3:
                        education = line
                        break
        except:
            pass
            
    education = education.title().replace('B.Tech', 'B.Tech').replace('M.Tech', 'M.Tech')
    education = re.sub(r'[^\w\s\.,\-\(\)]', '', education)
        
    # 3. Skills
    skills = text
    if "skills" in text:
        try:
            skills_section = text.split("skills", 1)[1]
            skills = skills_section[:500] 
        except:
            pass
            
    # 4. Email
    email = "Not Found"
    email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    email_matches = re.findall(email_pattern, text)
    if email_matches:
        email = email_matches[0]
        
    # Cleanup Skills
    for char in ['\n', '\r', '\t', ';', '|']:
        skills = skills.replace(char, ', ')
    for bullet in ['➢', '●', '•', '·', '-', '–', '>']:
         skills = skills.replace(bullet, ', ')
    skills = re.sub(r'\s+', ' ', skills)
    skills = re.sub(r',\s*,', ', ', skills)
    skills = skills.replace(',', ', ')
    skills = re.sub(r'\s+', ' ', skills)
    skills = skills.strip(' ,')

    return {
        "skills": skills,
        "experience_years": experience_years,
        "education": education,
        "email": email,
        "name": candidate_name
    }

def extract_text_from_pdf_bytes(file_content):
    MIN_TEXT_LENGTH = 50
    text = ""
    
    # Strategy 1: pypdf plain
    try:
        pdf_reader = PdfReader(io.BytesIO(file_content))
        plain_text = ""
        for i, page in enumerate(pdf_reader.pages):
            if i >= 3: break
            try:
                page_text = page.extract_text() or ""
                plain_text += page_text + "\n"
            except: pass

        if len(plain_text.strip()) >= MIN_TEXT_LENGTH:
            return plain_text
    except: pass

    # Strategy 2: pypdf layout
    try:
        pdf_reader = PdfReader(io.BytesIO(file_content))
        layout_text = ""
        for i, page in enumerate(pdf_reader.pages):
            if i >= 3: break
            try:
                page_text = page.extract_text(extraction_mode="layout") or ""
                layout_text += page_text + "\n"
            except: pass

        if len(layout_text.strip()) >= MIN_TEXT_LENGTH:
            return layout_text
    except: pass

    # Strategy 3: OCR
    try:
        # Optimize: Reduce DPI to 150 and limit to first 2 pages (Using limits from previous optimization)
        images = convert_from_bytes(file_content, dpi=150, last_page=2)
        ocr_text = ""
        for i, image in enumerate(images):
            page_text = pytesseract.image_to_string(image)
            ocr_text += page_text + "\n"
        return ocr_text
    except Exception as e:
        print(f"OCR Failed: {e}")
        return text

def extract_text_from_image(file_content):
    try:
        image = Image.open(io.BytesIO(file_content))
        if image.mode not in ('L', 'RGB'):
            image = image.convert('RGB')
        return pytesseract.image_to_string(image)
    except:
        return ""

def extract_text_from_file(file_content, filename):
    ext = os.path.splitext(filename)[1].lower() if filename else ''
    if ext in IMAGE_EXTENSIONS:
        return extract_text_from_image(file_content)
    elif ext in PDF_EXTENSIONS or ext == '':
        return extract_text_from_pdf_bytes(file_content)
    else:
        return ""
