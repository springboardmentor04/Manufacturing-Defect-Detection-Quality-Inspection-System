import torch
import torch.nn as nn


class AnomalyAutoencoder(nn.Module):

    def __init__(self):
        super().__init__()

        # ---------------- Encoder ----------------

        self.encoder = nn.Sequential(

            nn.Conv2d(3, 32, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),

            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),

            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2)
        )

        # ---------------- Decoder ----------------

        self.decoder = nn.Sequential(

            nn.ConvTranspose2d(
                128,
                64,
                kernel_size=2,
                stride=2
            ),
            nn.ReLU(),

            nn.ConvTranspose2d(
                64,
                32,
                kernel_size=2,
                stride=2
            ),
            nn.ReLU(),

            nn.ConvTranspose2d(
                32,
                3,
                kernel_size=2,
                stride=2
            ),

            nn.Sigmoid()
        )

    def forward(self, x):

        encoded = self.encoder(x)

        decoded = self.decoder(encoded)

        return decoded