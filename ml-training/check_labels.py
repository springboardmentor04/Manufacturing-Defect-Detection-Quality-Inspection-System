from pathlib import Path

LABEL_DIRS = [
    Path("dataset/yolo/labels/train"),
    Path("dataset/yolo/labels/val"),
    Path("dataset/yolo/labels/test")
]

NUM_CLASSES = 2

errors = 0
total_labels = 0

for label_dir in LABEL_DIRS:

    if not label_dir.exists():
        print(f"⚠️ Folder not found: {label_dir}")
        continue

    print(f"\nChecking: {label_dir}")

    for file in label_dir.glob("*.txt"):

        with open(file, "r") as f:
            lines = f.readlines()

        for line_number, line in enumerate(lines, start=1):

            parts = line.strip().split()

            if len(parts) != 5:
                print(
                    f"❌ {file} line {line_number}: "
                    f"Expected 5 values, got {len(parts)}"
                )
                errors += 1
                continue

            try:
                class_id = int(parts[0])
                x, y, w, h = map(float, parts[1:])
            except ValueError:
                print(f"❌ {file} line {line_number}: Invalid numbers")
                errors += 1
                continue

            if class_id < 0 or class_id >= NUM_CLASSES:
                print(
                    f"❌ {file} line {line_number}: "
                    f"Invalid class ID {class_id}"
                )
                errors += 1

            for value, name in zip(
                [x, y, w, h],
                ["x", "y", "width", "height"]
            ):
                if not 0 <= value <= 1:
                    print(
                        f"❌ {file} line {line_number}: "
                        f"{name}={value} outside 0-1"
                    )
                    errors += 1

            total_labels += 1

print("\n==============================")
print("LABEL CHECK COMPLETE")
print("==============================")
print(f"Total labels checked: {total_labels}")
print(f"Errors found: {errors}")

if errors == 0:
    print("✅ All labels look valid!")
else:
    print("❌ Fix the errors before training.")