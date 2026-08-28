import os
import yaml
from pathlib import Path


def prepare_yolo_dataset_structure(base_dir: str = "dataset"):
    project_root = Path(__file__).resolve().parent.parent.parent
    dataset_path = project_root / base_dir

    folders = [
        dataset_path / "images" / "train",
        dataset_path / "images" / "val",
        dataset_path / "labels" / "train",
        dataset_path / "labels" / "val",
    ]

    for folder in folders:
        os.makedirs(folder, exist_ok=True)
        print(f"📁 Verified folder: {folder}")

    dataset_config = {
        "path": str(dataset_path.absolute()),
        "train": "images/train",
        "val": "images/val",
        "names": {
            0: "Surface Scratch",
            1: "Cracked Solder Joint",
            2: "Missing Component",
            3: "Misalignment",
            4: "Cracked Screen",
        },
    }

    yaml_file = dataset_path / "dataset.yaml"
    with open(yaml_file, "w") as f:
        yaml.dump(dataset_config, f, default_flow_style=False, sort_keys=False)

    print(f"\n✅ Created config: {yaml_file}")
    return str(yaml_file)


if __name__ == "__main__":
    prepare_yolo_dataset_structure()
