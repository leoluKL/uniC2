import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";

function InstantPopup({ title, content, image, onClose, autoCloseTime = 3000, hideCloseBtn = true }) {
  useEffect(() => {
    if (autoCloseTime > 0) {
      const timer = setTimeout(onClose, autoCloseTime);
      return () => clearTimeout(timer);
    }
  }, [autoCloseTime, onClose]);

  return (
    <div className="fixed z-50 inset-0 flex justify-center items-center" onClick={onClose}>
      <div
        className="backdrop-filter backdrop-blur-lg bg-white bg-opacity-70 p-4 border rounded-lg shadow-md w-80 text-left relative"
      >
        {!hideCloseBtn && (
          <button
            className="absolute z-50 top-2 right-2 text-stone-500 w-12 h-10 flex items-center justify-center text-2xl"
            onClick={onClose}
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        )}
        {title && <h2 className="text-lg font-bold mb-2">{title}</h2>}
        <p className="text-gray-700 whitespace-pre-line">{content}</p>
        {image && <img alt="popupImage" src={image} className="object-contain mx-auto mt-2" />}
      </div>
    </div>
  );
}

export function showPopupInstant({ title, content, image, autoCloseTime = 3000, hideCloseBtn = true }) {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const handleClose = () => {
    ReactDOM.unmountComponentAtNode(container);
    container.remove();
  };

  ReactDOM.render(
    <InstantPopup
      title={title}
      content={content}
      image={image}
      autoCloseTime={autoCloseTime}
      hideCloseBtn={hideCloseBtn}
      onClose={handleClose}
    />,
    container
  );
}