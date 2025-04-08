import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { Button } from "./ui/button";

export function ThemeToggle() {
	const { theme, toggleTheme } = useTheme();

	return (
		<Button
			variant="ghost"
			size="icon"
			onClick={toggleTheme}
			title={
				theme === "light" ? "Switch to dark theme" : "Switch to light theme"
			}
			className="text-foreground"
		>
			{theme === "light" ? (
				<Moon className="size-5" />
			) : (
				<Sun className="size-5" />
			)}
			<span className="sr-only">Toggle theme</span>
		</Button>
	);
}
