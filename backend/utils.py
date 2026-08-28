import os

UPLOAD_FOLDER = "uploads/products"


def create_upload_folder():

    os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def get_upload_path(filename):

    return os.path.join(
        UPLOAD_FOLDER,
        filename
    )