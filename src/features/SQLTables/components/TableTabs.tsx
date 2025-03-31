import { useRef, useEffect, useState, useCallback } from "react";
import type React from "react";
import { IoChevronBack, IoChevronForward, IoClose } from "react-icons/io5";
import { Button } from "../../../components/ui/button";

interface TableTabsProps {
	tables: string[];
	activeTable: string | null;
	setActiveTable: (tableName: string) => void;
	handleCloseTable: (tableName: string, event: React.MouseEvent) => void;
}

const TableTabs: React.FC<TableTabsProps> = ({
	tables,
	activeTable,
	setActiveTable,
	handleCloseTable,
}) => {
	const tabsRef = useRef<HTMLDivElement>(null);
	const [showScrollButtons, setShowScrollButtons] = useState({
		left: false,
		right: false,
	});

	// Check if scroll buttons should be visible
	const checkScrollButtons = useCallback(() => {
		if (tabsRef.current) {
			const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
			setShowScrollButtons({
				left: scrollLeft > 0,
				right: scrollLeft < scrollWidth - clientWidth,
			});
		}
	}, []);

	// Add scroll event listener
	useEffect(() => {
		checkScrollButtons();
		window.addEventListener("resize", checkScrollButtons);
		return () => window.removeEventListener("resize", checkScrollButtons);
	}, [checkScrollButtons]);

	// Scroll tabs left or right
	const scrollTabs = (direction: "left" | "right") => {
		if (tabsRef.current) {
			const scrollAmount = direction === "left" ? -200 : 200;
			tabsRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
			setTimeout(checkScrollButtons, 100); // Check after scroll animation
		}
	};

	return (
		<div className="flex items-center border-b border-border bg-muted/20">
			{/* Left Scroll Button */}
			{showScrollButtons.left && (
				<Button
					variant="ghost"
					size="icon"
					onClick={() => scrollTabs("left")}
					className="flex-none p-0 h-9 w-9 rounded-none text-foreground hover:bg-muted/50"
				>
					<IoChevronBack className="w-4 h-4" />
				</Button>
			)}

			{/* Scrollable Tabs Container */}
			<div
				ref={tabsRef}
				className="flex-1 flex overflow-x-auto scrollbar-hide"
				onScroll={checkScrollButtons}
			>
				{tables.map((table) => (
					<Button
						key={table}
						variant="ghost"
						onClick={() => setActiveTable(table)}
						className={`group relative flex-none flex items-center px-4 py-2 h-9 text-sm transition-colors mx-[1px]
              ${
								activeTable === table
									? "bg-white dark:bg-slate-800 border-t-[3px] border-t-primary border-x border-x-border rounded-t-md border-b-0 text-foreground font-semibold shadow-md z-10"
									: "text-muted-foreground hover:bg-muted/70 border-b border-border rounded-none"
							}`}
					>
						<span className="max-w-[150px] truncate">{table}</span>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							onClick={(e: React.MouseEvent) => {
								e.stopPropagation();
								handleCloseTable(table, e);
							}}
							className="ml-2 h-5 w-5 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
							aria-label={`Close ${table} tab`}
						>
							<IoClose className="w-3 h-3 text-muted-foreground" />
						</Button>
					</Button>
				))}
			</div>

			{/* Right Scroll Button */}
			{showScrollButtons.right && (
				<Button
					variant="ghost"
					size="icon"
					onClick={() => scrollTabs("right")}
					className="flex-none p-0 h-9 w-9 rounded-none text-foreground hover:bg-muted/50"
				>
					<IoChevronForward className="w-4 h-4" />
				</Button>
			)}
		</div>
	);
};

export default TableTabs;
