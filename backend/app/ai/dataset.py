from PIL import Image
from torch.utils.data import Dataset
from torchvision import transforms


class MVTecDataset(Dataset):

    def __init__(
        self,
        root_dir,
        image_paths=None,
        labels=None,
        train=True
    ):
        self.root_dir = root_dir
        self.images = image_paths if image_paths else []
        self.labels = labels if labels else []

        self.transform = transforms.Compose([
            transforms.Resize((256, 256)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            )
        ])

    def __len__(self):
        return len(self.images)

    def __getitem__(self, index):

        image = Image.open(
            self.images[index]
        ).convert("RGB")

        image = self.transform(image)

        label = self.labels[index]

        return image, label