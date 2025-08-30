import { FiExternalLink } from "react-icons/fi";
import { getCategoryIcon } from "../utils/categoryUtils";
import type { Category } from "../data/categories";

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
    className="group relative bg-[#EEEFE0] rounded-2xl p-6 border border-[#D1D8BE] shadow-sm transition-all duration-500 ease-out hover:shadow-xl hover:shadow-[#819A91]/20 hover:-translate-y-2 hover:scale-[1.02] hover:border-[#A7C1A8] cursor-pointer"
    onClick={() => onCategoryClick(category)}
  >
    <div className="flex items-start gap-4 mb-4">
      <div className="relative">
        <div className="w-12 h-12 bg-[#D1D8BE] rounded-xl flex items-center justify-center text-2xl text-[#819A91] group-hover:bg-[#A7C1A8] group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 ease-out">
          {getCategoryIcon(category.id)}
        </div>
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#819A91] rounded-full flex items-center justify-center text-white text-xs font-medium group-hover:scale-125 group-hover:bg-[#6b8068] transition-all duration-300 ease-out">
          {category.casks.length}
        </div>
      </div>
      <div className="flex-1">
        <h3 className="text-xl font-semibold text-slate-800 mb-1 group-hover:text-[#819A91] group-hover:translate-x-1 transition-all duration-400 ease-out">
          {category.id}
        </h3>
        <p className="text-slate-600 text-sm group-hover:text-slate-700 transition-colors duration-300">
          {category.casks.length} applications available
        </p>
      </div>
    </div>

    <div className="flex items-center justify-between">
      <div className="flex -space-x-1">
        {category.casks.slice(0, 4).map((cask, index) => (
          <div
            key={cask}
            className="w-6 h-6 bg-[#A7C1A8] rounded-full border-2 border-[#EEEFE0] flex items-center justify-center text-xs font-medium text-[#819A91] group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300 ease-out"
            style={{
              zIndex: 4 - index,
              transitionDelay: `${index * 50}ms`,
            }}
          >
            {cask.charAt(0).toUpperCase()}
          </div>
        ))}
        {category.casks.length > 4 && (
          <div
            className="w-6 h-6 bg-[#819A91] rounded-full border-2 border-[#EEEFE0] flex items-center justify-center text-xs font-medium text-white group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300 ease-out"
            style={{ transitionDelay: "200ms" }}
          >
            +{category.casks.length - 4}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#D1D8BE] rounded-lg border border-[#A7C1A8] group-hover:bg-[#A7C1A8] group-hover:shadow-md group-hover:scale-105 transition-all duration-400 ease-out">
        <span className="text-[#819A91] font-medium text-sm group-hover:text-[#6b8068] transition-colors duration-300">
          Explore
        </span>
        <FiExternalLink
          size={14}
          className="text-[#819A91] group-hover:translate-x-1 group-hover:-translate-y-0.5 group-hover:text-[#6b8068] transition-all duration-400 ease-out"
        />
      </div>
    </div>
  </div>
);
