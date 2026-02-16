import "./RoomButton.css"
type RoomButton = {
    icon : string
    label: string;
    onClick?: () => void;
    type?: "button" | "submit" | "reset";

}
const RoomButton = ({ icon, label, onClick, type }: RoomButton) => {
    return (
        <button onClick = {onClick} className="RoomButton" type={type}>
            <img src={icon} className="RoomButtonicon" alt="" />
            <p>{label}</p>
        </button>
    )
}
export default RoomButton;