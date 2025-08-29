import { FiExternalLink } from "react-icons/fi";
import { getCategoryIcon } from "../utils/categoryUtils";
import { type Category } from "../data/categories";

interface CategoryCardProps {
  category: Category;
  onCategoryClick: (category: Category) => void;
}

export const CategoryCard = ({
  category,
  onCategoryClick,
}: CategoryCardProps) => (
  <div
    key={category.id}
    className="group relative bg-white/70 backdrop-blur-xl rounded-3xl p-8 border border-white/40 shadow-lg shadow-slate-200/20 transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-3 hover:border-indigo-200/50 cursor-pointer overflow-hidden"
    onClick={() => onCategoryClick(category)}
  >
    {/* Background gradient overlay */}
    <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/40 via-purple-50/30 to-blue-50/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

    <div className="relative z-10">
      <div className="flex items-start gap-6 mb-6">
        <div className="relative">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 via-purple-100 to-blue-100 rounded-2xl flex items-center justify-center text-3xl shadow-xl shadow-indigo-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
            {getCategoryIcon(category.id)}
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">
            {category.casks.length}
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-2xl font-bold text-slate-800 mb-2 group-hover:text-indigo-700 transition-colors duration-300">
            {category.id}
          </h3>
          <p className="text-slate-500 font-medium">
            {category.casks.length} applications available
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex -space-x-2">
          {category.casks.slice(0, 4).map((cask, index) => (
            <div
              key={cask}
              className="w-8 h-8 bg-gradient-to-br from-indigo-200 to-purple-200 rounded-full border-3 border-white flex items-center justify-center text-sm font-bold text-indigo-700 shadow-lg group-hover:scale-110 transition-all duration-300"
              style={{
                zIndex: 4 - index,
                transitionDelay: `${index * 50}ms`,
              }}
            >
              {cask.charAt(0).toUpperCase()}
            </div>
          ))}
          {category.casks.length > 4 && (
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full border-3 border-white flex items-center justify-center text-sm font-bold text-white shadow-lg group-hover:scale-110 transition-all duration-300">
              +{category.casks.length - 4}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 px-4 py-2 bg-indigo-50 rounded-2xl border border-indigo-200 group-hover:bg-indigo-100 transition-all duration-300">
          <span className="text-indigo-700 font-semibold">Explore</span>
          <FiExternalLink
            size={16}
            className="text-indigo-600 group-hover:translate-x-1 group-hover:scale-110 transition-all duration-300"
          />
        </div>
      </div>
    </div>
  </div>
);
