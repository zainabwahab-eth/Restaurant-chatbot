const menuItems = {
  // Main Food Categories
  mains: {
    name: "Main Dishes",
    items: [
      {
        id: "M001",
        name: "Jollof Rice with Chicken",
        price: 2500,
        description: "Nigerian jollof rice served with grilled chicken",
      },
      {
        id: "M002",
        name: "Fried Rice with Beef",
        price: 2800,
        description: "Delicious fried rice with tender beef",
      },
      {
        id: "M003",
        name: "Pounded Yam with Egusi Soup",
        price: 3000,
        description: "Traditional pounded yam with rich egusi soup",
      },
      {
        id: "M004",
        name: "Rice and Beans with Fish",
        price: 2200,
        description: "Local rice and beans served with fried fish",
      },
      {
        id: "M005",
        name: "Amala with Gbegiri and Ewedu",
        price: 2000,
        description: "Amala served with gbegiri and ewedu soup",
      },
    ],
  },

  // Snacks and Light Meals
  snacks: {
    name: "Snacks & Light Meals",
    items: [
      {
        id: "S001",
        name: "Meat Pie",
        price: 500,
        description: "Freshly baked meat pie with seasoned beef",
      },
      {
        id: "S002",
        name: "Sausage Roll",
        price: 400,
        description: "Crispy pastry filled with spiced sausage",
      },
      {
        id: "S003",
        name: "Chicken Pie",
        price: 600,
        description: "Flaky pastry with chicken and vegetables",
      },
      {
        id: "S004",
        name: "Buns (Burger)",
        price: 800,
        description: "Nigerian-style burger with beef patty",
      },
      {
        id: "S005",
        name: "Gala (Sausage)",
        price: 250,
        description: "Popular Nigerian sausage snack",
      },
    ],
  },

  // Beverages
  drinks: {
    name: "Beverages",
    items: [
      {
        id: "D001",
        name: "Coca Cola",
        price: 300,
        description: "Cold coca cola drink",
      },
      {
        id: "D002",
        name: "Sprite",
        price: 300,
        description: "Refreshing lemon-lime soda",
      },
      {
        id: "D003",
        name: "Fanta Orange",
        price: 300,
        description: "Orange flavored soda drink",
      },
      {
        id: "D004",
        name: "Bottled Water",
        price: 200,
        description: "Pure bottled water",
      },
      {
        id: "D005",
        name: "Fresh Orange Juice",
        price: 800,
        description: "Freshly squeezed orange juice",
      },
      {
        id: "D006",
        name: "Zobo Drink",
        price: 500,
        description: "Nigerian hibiscus drink with spices",
      },
    ],
  },

  // Desserts
  desserts: {
    name: "Desserts",
    items: [
      {
        id: "DS001",
        name: "Chocolate Cake",
        price: 1200,
        description: "Rich chocolate cake slice",
      },
      {
        id: "DS002",
        name: "Ice Cream",
        price: 800,
        description: "Vanilla ice cream scoop",
      },
      {
        id: "DS003",
        name: "Fruit Salad",
        price: 1000,
        description: "Fresh mixed fruit salad",
      },
      {
        id: "DS004",
        name: "Puff Puff",
        price: 100,
        description: "Traditional Nigerian sweet snack (per piece)",
      },
    ],
  },
};

// Helper functions
const menuHelpers = {
  // Get all categories
  getCategories() {
    return Object.keys(menuItems).map((key, index) => ({
      id: key,
      number: index + 1,
      name: menuItems[key].name,
      itemCount: menuItems[key].items.length,
    }));
  },

  // Get category by key
  getCategory(categoryKey) {
    return menuItems[categoryKey] || null;
  },

  // Get all items in a category with numbers
  getCategoryItems(categoryKey) {
    const category = this.getCategory(categoryKey);
    if (!category) return null;

    return category.items.map((item, index) => ({
      ...item,
      number: index + 1,
      category: categoryKey,
      formattedPrice: `₦${item.price.toLocaleString()}`,
    }));
  },

  // Find item by ID
  findItemById(itemId) {
    for (const categoryKey in menuItems) {
      const item = menuItems[categoryKey].items.find(
        (item) => item.id === itemId
      );
      if (item) {
        return {
          ...item,
          category: categoryKey,
          formattedPrice: `₦${item.price.toLocaleString()}`,
        };
      }
    }
    return null;
  },

  // Find item by category and number selection
  findItemBySelection(categoryKey, itemNumber) {
    const category = this.getCategory(categoryKey);
    if (!category || itemNumber < 1 || itemNumber > category.items.length) {
      return null;
    }

    const item = category.items[itemNumber - 1];
    return {
      ...item,
      category: categoryKey,
      formattedPrice: `₦${item.price.toLocaleString()}`,
    };
  },

  // Format menu display for bot
  formatCategoryMenu(categoryKey) {
    const items = this.getCategoryItems(categoryKey);
    if (!items) return null;

    const category = this.getCategory(categoryKey);
    let menu = `🍽️ *${category.name}*\n\n`;

    items.forEach((item) => {
      menu += `${item.number}. ${item.name} - ${item.formattedPrice}\n`;
      menu += `   ${item.description}\n\n`;
    });

    menu += `Select item number (1-${items.length})\n`;
    menu += `Or type 'back' to return to main menu`;

    return menu;
  },

  // Format main categories menu
  formatMainMenu() {
    const categories = this.getCategories();
    let menu = `🍽️ *Welcome to Our Restaurant!*\n\nSelect a category:\n\n`;

    categories.forEach((category) => {
      menu += `${category.number}. ${category.name} (${category.itemCount} items)\n`;
    });

    menu += `\n📋 *Other Options:*\n`;
    menu += `97 - View current order\n`;
    menu += `98 - View order history\n`;
    menu += `99 - Checkout order\n`;
    menu += `0 - Cancel current order`;

    return menu;
  },
};

module.exports = {
  menuItems,
  menuHelpers,
};
