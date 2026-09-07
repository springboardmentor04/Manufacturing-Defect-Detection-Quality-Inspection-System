import torch.nn as nn


# ==========================================================
# CONVOLUTION BLOCK
# ==========================================================

class ConvBlock(nn.Module):

    def __init__(
        self,
        in_channels,
        out_channels,
        dropout=0.0
    ):

        super().__init__()


        layers = [

            nn.Conv2d(
                in_channels,
                out_channels,
                kernel_size=3,
                padding=1,
                bias=False
            ),

            nn.BatchNorm2d(
                out_channels
            ),

            nn.ReLU(
                inplace=True
            ),


            nn.Conv2d(
                out_channels,
                out_channels,
                kernel_size=3,
                padding=1,
                bias=False
            ),

            nn.BatchNorm2d(
                out_channels
            ),

            nn.ReLU(
                inplace=True
            ),


            nn.MaxPool2d(
                kernel_size=2,
                stride=2
            )
        ]


        if dropout > 0:

            layers.append(
                nn.Dropout2d(dropout)
            )


        self.block = nn.Sequential(
            *layers
        )


    def forward(self, x):

        return self.block(x)


# ==========================================================
# CUSTOM CNN
# ==========================================================

class CustomCNN(nn.Module):

    def __init__(self):

        super().__init__()


        self.features = nn.Sequential(

            ConvBlock(
                3,
                32,
                dropout=0.02
            ),

            ConvBlock(
                32,
                64,
                dropout=0.03
            ),

            ConvBlock(
                64,
                128,
                dropout=0.05
            ),

            ConvBlock(
                128,
                256,
                dropout=0.07
            ),

            ConvBlock(
                256,
                384,
                dropout=0.10
            )
        )


        self.global_pool = nn.AdaptiveAvgPool2d(
            (1, 1)
        )


        self.classifier = nn.Sequential(

            nn.Flatten(),

            nn.Linear(
                384,
                128
            ),

            nn.BatchNorm1d(
                128
            ),

            nn.ReLU(
                inplace=True
            ),

            nn.Dropout(
                0.20
            ),

            nn.Linear(
                128,
                2
            )
        )


    def forward(self, x):

        x = self.features(x)

        x = self.global_pool(x)

        x = self.classifier(x)

        return x