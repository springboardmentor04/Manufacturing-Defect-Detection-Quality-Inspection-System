import torch.nn as nn

class DefectCNN(nn.Module):

    def __init__(self,num_classes):

        super().__init__()

        self.features = nn.Sequential(

            nn.Conv2d(3,32,3,padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),

            nn.Conv2d(32,64,3,padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),

            nn.Conv2d(64,128,3,padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),

            nn.AdaptiveAvgPool2d((1,1))

        )

        self.classifier = nn.Sequential(

            nn.Flatten(),

            nn.Linear(128,64),

            nn.ReLU(),

            nn.Dropout(0.3),

            nn.Linear(64,num_classes)

        )

    def forward(self,x):

        x = self.features(x)

        x = self.classifier(x)

        return x