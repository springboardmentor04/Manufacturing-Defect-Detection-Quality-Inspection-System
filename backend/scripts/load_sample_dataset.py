import os
import sys
import shutil
import uuid
import argparse

# Ensure backend folder is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal, engine, Base
from app.models import Role, User, Image, Inspection
from app.auth import hash_password

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".webp"}

def ensure_default_admin(db):
    # Check or create 'admin' role
    admin_role = db.query(Role).filter(Role.role_name == "admin").first()
    if not admin_role:
        admin_role = Role(role_name="admin")
        db.add(admin_role)
        db.commit()
        db.refresh(admin_role)
        
    # Check for existing admin user
    admin_user = db.query(User).filter(User.role_id == admin_role.id).first()
    if not admin_user:
        admin_user = db.query(User).filter(User.username == "admin").first()
        
    if not admin_user:
        print("[+] Creating default admin user (username: 'admin')...")
        admin_user = User(
            username="admin",
            email="admin@visioninspect.ai",
            password_hash=hash_password("Admin@123"),
            role_id=admin_role.id
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        print(f"[+] Admin user created with ID {admin_user.id}")
    else:
        print(f"[+] Using existing admin user '{admin_user.username}' (ID: {admin_user.id})")
        
    return admin_user

def load_sample_dataset(source_dir: str):
    uploads_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
    os.makedirs(uploads_dir, exist_ok=True)

    db = SessionLocal()
    try:
        admin_user = ensure_default_admin(db)
        
        if not os.path.exists(source_dir):
            print(f"[!] Target directory '{source_dir}' does not exist.")
            print("[!] Creating directory and generating dummy sample images for demonstration...")
            os.makedirs(source_dir, exist_ok=True)
            # Create a couple of sample placeholder files for testing if folder was empty
            try:
                from PIL import Image as PILImage
                for i in range(1, 4):
                    img_path = os.path.join(source_dir, f"sample_defect_{i}.png")
                    img = PILImage.new("RGB", (256, 256), color=(50 * i, 100, 150))
                    img.save(img_path)
                print(f"[+] Generated 3 sample images in '{source_dir}'")
            except ImportError:
                # If PIL not installed, write minimal bytes or text file
                for i in range(1, 4):
                    with open(os.path.join(source_dir, f"sample_defect_{i}.png"), "wb") as f:
                        f.write(b"PNG_SAMPLE_DUMMY_DATA")

        loaded_count = 0
        for root, _, files in os.walk(source_dir):
            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext not in ALLOWED_EXTENSIONS:
                    continue

                src_path = os.path.join(root, file)
                unique_filename = f"{uuid.uuid4().hex}_{file}"
                dst_path = os.path.join(uploads_dir, unique_filename)

                shutil.copy2(src_path, dst_path)

                relative_filepath = f"uploads/{unique_filename}"
                db_image = Image(
                    uploaded_by=admin_user.id,
                    filename=unique_filename,
                    filepath=relative_filepath,
                    upload_source="batch",
                    status="pending"
                )
                db.add(db_image)
                db.flush()

                db_inspection = Inspection(
                    image_id=db_image.id,
                    status="queued"
                )
                db.add(db_inspection)
                loaded_count += 1

        db.commit()
        print(f"[✓] Loaded {loaded_count} images successfully into database and uploads directory.")
    except Exception as e:
        db.rollback()
        print(f"[X] Error loading dataset: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Bulk load sample dataset images into VisionInspect AI backend.")
    parser.add_argument("--dir", type=str, default="./sample_data/mvtec_ad", help="Directory containing sample images (default: ./sample_data/mvtec_ad)")
    args = parser.parse_args()
    
    load_sample_dataset(args.dir)
