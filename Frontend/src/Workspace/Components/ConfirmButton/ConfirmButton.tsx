import "./ConfirmButton.css"
type ConfirmButton = {
    label: string;
    onClick?: () => void;
    type?: "button" | "submit" | "reset";

}
const ConfirmButton = ({ label, onClick, type }: ConfirmButton) => {
    return (
        <button onClick = {onClick} className="ConfirmButton" type={type}>
            <p>{label}</p>
        </button>
    )
}
export default ConfirmButton;