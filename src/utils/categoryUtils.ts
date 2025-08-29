export const getCategoryIcon = (categoryId: string) => {
  const iconMap: Record<string, string> = {
    Browsers: "🌐",
    Communication: "💬",
    Productivity: "⚡",
    "Office Tools": "📄",
    "Menu Bar": "📋",
    Utilities: "🔧",
    Maintenance: "🧹",
    "Creative Tools": "🎨",
    Media: "🎵",
    "Developer Tools": "👨‍💻",
    IDEs: "💻",
    Terminals: "⌨️",
    Virtualization: "📦",
    Gaming: "🎮",
    VPN: "🔒",
    "Password Managers": "🔐",
  };
  return iconMap[categoryId] || "📱";
};
