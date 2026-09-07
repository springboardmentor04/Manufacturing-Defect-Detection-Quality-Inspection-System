from app.ai.predict import predict

result = predict(
    "dataset/mvtec_ad/bottle/test/broken_large/000.png"
)

print(result)