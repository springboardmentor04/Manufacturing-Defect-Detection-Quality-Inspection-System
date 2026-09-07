from app.ai.dataset_loader import get_categories, get_category_info

categories = get_categories()

print("Available Categories:")
print(categories)

print()

for category in categories:
    print(get_category_info(category))