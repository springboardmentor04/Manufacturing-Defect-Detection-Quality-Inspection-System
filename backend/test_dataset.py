from app.ai.dataset import MVTecDataset

dataset = MVTecDataset(
    root_dir="dataset/mvtec_ad",
    category="bottle"
)

print("Dataset Size:", len(dataset))

image, label = dataset[0]

print("Image Shape:", image.shape)
print("Label:", label)