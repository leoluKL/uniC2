import { useState, useRef, useEffect } from 'react';

function DropdownSelector({ options, onSelectionChange, editable = false, initValue = '' , resetAfterSelect = false}) {
    const [showDropdown, setShowDropdown] = useState(false);
    const [selected, setSelected] = useState(initValue);
    const [inputValue, setInputValue] = useState(initValue);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const ref = useRef(null);

    const filteredOptions = editable && inputValue.length >= 2
        ? options.filter(opt => opt.toLowerCase().includes(inputValue.toLowerCase()))
        : options;

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setShowDropdown(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!showDropdown) {
            setHighlightedIndex(-1);
        }
    }, [filteredOptions]);

    const handleSelect = (option) => {
        setSelected(option);
        setInputValue(resetAfterSelect ? '' : option);
        setShowDropdown(false);
        onSelectionChange(option);
    };

    return (
        <div ref={ref} className="relative inline-block min-w-32 bg-white text-black">
            <div className="border border-black flex items-center justify-between px-2 py-1 cursor-pointer"
                onClick={() => setShowDropdown(prev => !prev)}>
                {editable ? (
                    <input
                        className="w-full outline-none"
                        value={inputValue}
                        placeholder="Type to search..."
                        onChange={e => {
                            setInputValue(e.target.value);
                            if (!showDropdown) setShowDropdown(true); 
                        }}
                        onFocus={() => setShowDropdown(true)}
                        onClick={e => e.stopPropagation()}
                        onKeyDown={(e) => {
                            if (!showDropdown) return;

                            if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                setHighlightedIndex(prev =>
                                    prev < filteredOptions.length - 1 ? prev + 1 : 0
                                );
                            } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                setHighlightedIndex(prev =>
                                    prev > 0 ? prev - 1 : filteredOptions.length - 1
                                );
                            } else if (e.key === 'Enter') {
                                e.preventDefault();
                                if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
                                    handleSelect(filteredOptions[highlightedIndex]);
                                }
                            }
                        }}
                    />
                ) : (
                    <span className={selected ? '' : 'text-gray-400'}>{selected || 'Choose'}</span>
                )}
                <span className="ml-2">▾</span>
            </div>

            {showDropdown && (
                <div className="absolute z-10 border border-black bg-white w-full max-h-40 overflow-y-auto">
                    {filteredOptions.map((opt, idx) => (
                        <div key={idx}
                            className={`px-2 py-1 cursor-pointer  ${idx === highlightedIndex ? 'bg-blue-300' : 'hover:bg-green-200 bg-gray-200'}`}
                            onClick={() => handleSelect(opt)}
                        >
                            {opt}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default DropdownSelector;