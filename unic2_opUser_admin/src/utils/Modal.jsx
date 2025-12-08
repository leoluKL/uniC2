import ReactDOM from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

function Modal({ show, onClose, children, width, styleHeight, top, closeByClickSelf = false, hideCloseBtn = false, closeByClickOutSide=true,
    anchorPoint = null, placement = "bottom-start", ...otherProps }) {
    if (!show) return null;

    function handleOverlayClick(e) {
        if (e.target === e.currentTarget && closeByClickOutSide) {
            onClose();
        }
    };

    // anchored floating style
    const [tx, ty] = ({
        'bottom-start': [0, 0],
        'bottom-end': [-100, 0],
        'top-start': [0, -100],
        'top-end': [-100, -100],
    }[placement] || [0, 0]);
    const panelStyle = {
        ...(anchorPoint
            ? { position: 'fixed', top: anchorPoint.y, left: anchorPoint.x, transform: `translate(${tx}%, ${ty}%)` }
            : { top, height: styleHeight }),
        backgroundImage: 'url("/resources/img/paperboard-yellow-texture.jpg")',
        backgroundSize: 'cover', backgroundRepeat: 'repeat', backgroundPosition: 'center',
        boxShadow: '0 4px 8px rgba(0,0,0,0.5)'
    };
    const panelClass = `${anchorPoint ? '' : (top == null ? 'relative' : 'absolute')} p-1 ${width ? width : ''}`;

    //<div className={`shadow-lg backdrop-filter backdrop-blur-lg bg-white bg-opacity-20 p-1 ${width} ${height}`}

    return ReactDOM.createPortal(
        <div className="fixed z-[110] inset-0 flex justify-center items-center" 
        style={{ height: `calc(100dvh)`}}
        onClick={handleOverlayClick}>
            <div className={panelClass} style={panelStyle} {...otherProps}
                onClick={(e) => { if (closeByClickSelf) onClose() }}
                onTouchMove={(e) => e.stopPropagation()}>

                {!hideCloseBtn && !anchorPoint && <button
                    className="absolute z-50 top-0 right-0 bg-blue-500 text-white w-12 h-12 flex items-center justify-center text-xl opacity-70"
                    onClick={onClose}
                >
                    <FontAwesomeIcon icon={faTimes} />
                </button>}

                {children}
            </div>
        </div>,
        document.body
    );
};

export default Modal;
