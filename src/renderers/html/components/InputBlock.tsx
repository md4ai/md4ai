interface Props {
  inputType: string;
  props: Record<string, string>;
}

export function InputBlock({ inputType, props }: Props) {
  const { id, placeholder, label, ...rest } = props;
  return (
    <div className="md4ai-input-wrapper">
      {label && <label htmlFor={id} className="md4ai-input-label">{label}</label>}
      <input
        id={id}
        type={inputType}
        placeholder={placeholder}
        className="md4ai-input"
        {...rest}
      />
    </div>
  );
}
