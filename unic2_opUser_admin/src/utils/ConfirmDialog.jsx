import Modal from './Modal'; // Assuming your existing Modal component is imported

const ConfirmDialog = ({ 
    show, 
    onClose, 
    onConfirm, 
    title=null,
    width="w-3/4",
    message = "Are you sure?", 
    cancelText = "Cancel", 
    confirmText = "OK",
    ...otherProps
}) => {
    return (
        <Modal show={show} onClose={onClose} hideCloseBtn={true} width={width}>
            <div className="flex flex-col justify-between p-4 backdrop-filter backdrop-blur-lg " {...otherProps}>
                {title!=null && <h2 className="text-center text-lg font-bold mb-2">{title}</h2>}
                <div className="text-center text-lg">
                    {message}
                </div>
                {/* Buttons */}
                <div className="flex justify-center space-x-4 mt-4">
                    <button
                        className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
                        onClick={onClose}
                    >
                        {cancelText}
                    </button>
                    <button testid="confirm-button"
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ConfirmDialog;