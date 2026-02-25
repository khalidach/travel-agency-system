import { forwardRef, InputHTMLAttributes } from 'react';

// Extend the standard input attributes so TypeScript knows 
// it's allowed to accept 'className', 'min', 'required', etc.
interface NumberInputProps extends InputHTMLAttributes<HTMLInputElement> {
    // You can add any custom props here in the future if needed
}

// Pass the element type FIRST, then the props type SECOND
const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>((props, ref) => {
    return (
        <input
            type="number"
            ref={ref}
            {...props}
            onWheel={(e) => {
                // Prevent scroll changes without dropping focus
                e.currentTarget.blur();
            }}
        />
    );
});

NumberInput.displayName = "NumberInput";
export default NumberInput;