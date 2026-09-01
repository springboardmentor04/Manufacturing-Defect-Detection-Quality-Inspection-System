import { useState } from "react";
import Navbar from "../components/Navbar";
import api from "../services/api";

function Upload() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [message, setMessage] = useState("");

  const handleImage = (e) => {
    const file = e.target.files[0];

    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setMessage("");
    }
  };

  const uploadImage = async () => {
    if (!image) {
      alert("Please select an image.");
      return;
    }

    const formData = new FormData();

    formData.append("file", image);

    const token = localStorage.getItem("token");

    if (!token) {
      alert("Please login again.");
      return;
    }

    try {
      const response = await api.post(
        "/upload/image",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setMessage(response.data.message);

      // Save uploaded image filename
      localStorage.setItem(
        "uploadedImage",
        response.data.filename
      );

      alert("Image uploaded successfully!");

    } catch (error) {
      console.log("Upload Error:", error);

      if (error.response) {
        alert(
          error.response.data.detail ||
          "Upload failed."
        );
      } else {
        alert("Cannot connect to backend.");
      }
    }
  };

  return (
    <>
      <Navbar />

      <div className="page">

        <div className="card">

          <h2>Upload Product Image</h2>

          <p>
            Upload a product image for AI-based quality inspection.
          </p>

          <input
            type="file"
            accept="image/*"
            onChange={handleImage}
          />

          {preview && (
            <div style={{ marginTop: "20px" }}>

              <h3>Image Preview</h3>

              <img
                src={preview}
                alt="Product Preview"
                style={{
                  width: "300px",
                  maxHeight: "300px",
                  objectFit: "contain",
                  marginTop: "15px",
                  borderRadius: "12px",
                  border: "1px solid #e0e0e0",
                }}
              />

            </div>
          )}

          <br />

          <button onClick={uploadImage}>
            Upload Image
          </button>

          {message && (
            <p style={{ marginTop: "20px" }}>
              {message}
            </p>
          )}

        </div>

      </div>
    </>
  );
}

export default Upload;