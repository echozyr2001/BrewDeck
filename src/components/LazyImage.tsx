import React from "react";
import { useLazyImage, type LazyImageProps } from "../utils/lazyLoading";

/**
 * Lazy loading image component
 */
export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = "",
  fallbackSrc,
  placeholder,
  ...props
}) => {
  const { imgRef, isLoaded, hasError } = useLazyImage(src, { fallbackSrc });

  // Don't render img element if src is empty
  if (!src) {
    return (
      <div className={`lazy-image-container ${className}`}>
        {placeholder && (
          <div className="lazy-image-placeholder">{placeholder}</div>
        )}
      </div>
    );
  }

  return (
    <div className={`lazy-image-container ${className}`}>
      {!isLoaded && !hasError && placeholder && (
        <div className="lazy-image-placeholder">{placeholder}</div>
      )}
      <img
        ref={imgRef}
        alt={alt}
        className={`lazy-image ${isLoaded ? "loaded" : ""} ${
          hasError ? "error" : ""
        }`}
        style={{
          opacity: isLoaded ? 1 : 0,
          transition: "opacity 0.3s ease-in-out",
        }}
        {...props}
      />
    </div>
  );
};
