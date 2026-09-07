from app.ai.dataloader import get_dataloaders

train_loader, val_loader = get_dataloaders()

print("Training Batches:", len(train_loader))
print("Validation Batches:", len(val_loader))

images, labels = next(iter(train_loader))

print("Image Batch Shape:", images.shape)
print("Label Batch Shape:", labels.shape)