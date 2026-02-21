import subprocess
import time
import os
import signal
import sys
import webbrowser
import socket
import threading

def run_project():
    """
    Robust script to start the ML Classifier project (Flask Backend + React Frontend).
    """
    base_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.join(base_dir, 'resume-classifier-frontend')
    
    # 0. Cleanup existing processes
    print("🧹 Cleaning up ports 5003 (Backend) and 5173 (Frontend)...")
    cleanup_ports([5003, 5173])

    # 1. Start Backend
    print("🚀 Starting Backend (Flask)...")
    backend_log = open(os.path.join(base_dir, 'backend.log'), 'w')
    # Use -u for unbuffered output to catch startup errors immediately
    backend = subprocess.Popen(
        [sys.executable, '-u', 'app.py'],
        cwd=base_dir,
        stdout=backend_log,
        stderr=subprocess.STDOUT
    )

    # 2. Wait for Backend (Critical Step)
    if not wait_for_port(5003, timeout=120, name="Backend"):
        print("❌ Backend failed to start. Check 'backend.log' for details.")
        backend.terminate()
        sys.exit(1)
    
    print("✅ Backend is ready on port 5003!")

    # 3. Start Frontend
    print("🚀 Starting Frontend (Vite)...")
    frontend_log = open(os.path.join(frontend_dir, 'frontend.log'), 'w')
    frontend = subprocess.Popen(
        ['npm', 'run', 'dev:clean'],
        cwd=frontend_dir,
        stdout=frontend_log,
        stderr=subprocess.STDOUT
    )

    # 4. Wait for Frontend
    if not wait_for_port(5173, timeout=60, name="Frontend"):
        print("❌ Frontend failed to start. Check 'resume-classifier-frontend/frontend.log'.")
        backend.terminate()
        frontend.terminate()
        sys.exit(1)

    print("✅ Frontend is ready on port 5173!")
    
    # 5. Launch Browser
    print("🌐 Opening Application...")
    time.sleep(1) # Slight buffer
    if sys.platform == 'darwin':
        try:
            subprocess.run(['open', '-a', 'Google Chrome', 'http://localhost:5173'])
        except Exception:
            webbrowser.open("http://localhost:5173")
    else:
        webbrowser.open("http://localhost:5173")
    
    print("\n" + "="*40)
    print("   PROJECT RUNNING SUCCESSFULLY   ")
    print("   Backend: http://localhost:5003 ")
    print("   Frontend: http://localhost:5173")
    print("="*40 + "\n")
    print("Press Ctrl+C to stop servers.")

    try:
        backend.wait()
        frontend.wait()
    except KeyboardInterrupt:
        print("\n🛑 Stopping servers...")
        backend.terminate()
        frontend.terminate()
        sys.exit(0)

def cleanup_ports(ports):
    for port in ports:
        try:
            # Find PID using lsof
            cmd = f"lsof -ti:{port}"
            output = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            if output.stdout.strip():
                pids = output.stdout.strip().split('\n')
                for pid in pids:
                    if pid:
                        os.kill(int(pid), signal.SIGKILL)
        except Exception as e:
            print(f"Warning: Could not clear port {port}: {e}")

def wait_for_port(port, timeout=60, name="Service"):
    print(f"⏳ Waiting for {name} on port {port}...")
    start_time = time.time()
    while time.time() - start_time < timeout:
        # Try IPv4
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(1)
                if s.connect_ex(('127.0.0.1', port)) == 0:
                    return True
        except:
            pass
            
        # Try IPv6
        try:
            with socket.socket(socket.AF_INET6, socket.SOCK_STREAM) as s:
                s.settimeout(1)
                if s.connect_ex(('::1', port)) == 0:
                    return True
        except:
            pass
            
        time.sleep(1)
    return False

if __name__ == "__main__":
    run_project()
