interface PieceProps {
	symbol: string;
}

function Piece({ symbol }: PieceProps) {
	if (!symbol) {
		return <span className="piece empty-piece">.</span>;
	}

	return <span className="piece">{symbol}</span>;
}

export default Piece;