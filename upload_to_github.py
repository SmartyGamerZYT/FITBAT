import os
import base64
import requests

def upload_project_to_github():
    print("=" * 60)
    print("      🚀 FITBAT AUTO-UPLOADER TO GITHUB 🚀")
    print("=" * 60)
    print("This script uploads all folders and files directly to your GitHub repo!\n")

    username = input("Enter your GitHub Username: ").strip()
    repo = input("Enter your Repository Name (e.g., fitbat): ").strip()
    token = input("Enter your GitHub Personal Access Token (PAT): ").strip()

    if not username or not repo or not token:
        print("❌ Error: Username, Repo, and Token are required!")
        return

    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json"
    }

    base_dir = os.path.dirname(os.path.abspath(__file__))
    uploaded_count = 0

    # Files / folders to exclude
    exclude_dirs = {'.git', '__pycache__', '.pytest_cache', 'venv'}
    exclude_files = {'fitbat.db', 'upload_to_github.py'}

    print("\n[+] Scanning and uploading all folders and files...")

    for root, dirs, files in os.walk(base_dir):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for f in files:
            if f in exclude_files or f.endswith('.pyc'):
                continue
            
            local_path = os.path.join(root, f)
            rel_path = os.path.relpath(local_path, base_dir).replace('\\', '/')
            
            with open(local_path, 'rb') as file_obj:
                content_bytes = file_obj.read()
                content_b64 = base64.b64encode(content_bytes).decode('utf-8')

            url = f"https://api.github.com/repos/{username}/{repo}/contents/{rel_path}"

            # Check if file already exists on GitHub to get sha
            get_res = requests.get(url, headers=headers)
            sha = None
            if get_res.status_code == 200:
                sha = get_res.json().get('sha')

            payload = {
                "message": f"Upload {rel_path}",
                "content": content_b64
            }
            if sha:
                payload["sha"] = sha

            put_res = requests.put(url, json=payload, headers=headers)
            if put_res.status_code in [200, 201]:
                print(f"  ✓ Uploaded: {rel_path}")
                uploaded_count += 1
            else:
                print(f"  ❌ Failed: {rel_path} - {put_res.text}")

    print(f"\n🎉 Finished! Uploaded {uploaded_count} files and folders to https://github.com/{username}/{repo}")
    print("Now you can go to Render.com and deploy your repository!")

if __name__ == "__main__":
    upload_project_to_github()
