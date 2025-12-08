import { Clock, Edit, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatTTL, formatSize, isJsonString } from "../utils";
import type { KeyInfo, KeyValue } from "../types";

interface KeyInfoPanelProps {
	keyName: string;
	keyInfo: KeyInfo;
}

/**
 * Displays metadata about a Redis key
 */
export function KeyInfoPanel({ keyName, keyInfo }: KeyInfoPanelProps) {
	return (
		<div className="p-4 border-b bg-muted/50">
			<div className="flex items-center justify-between mb-2">
				<h3 className="font-mono text-sm font-medium truncate flex-1">
					{keyName}
				</h3>
				<Badge variant="secondary" className="uppercase">
					{keyInfo.type}
				</Badge>
			</div>
			<div className="flex gap-4 text-sm text-muted-foreground">
				<div className="flex items-center gap-1">
					<Clock className="h-3 w-3" />
					<span>TTL: {formatTTL(keyInfo.ttl)}</span>
				</div>
				<div>Size: {formatSize(keyInfo.size)}</div>
			</div>
		</div>
	);
}

interface StringValueEditorProps {
	value: string;
	isEditing: boolean;
	editingValue: string;
	onEditStart: () => void;
	onEditChange: (value: string) => void;
	onSave: () => void;
	onCancel: () => void;
	onEditJson?: (value: string) => void;
}

/**
 * Editor for string type Redis values
 */
export function StringValueEditor({
	value,
	isEditing,
	editingValue,
	onEditStart,
	onEditChange,
	onSave,
	onCancel,
	onEditJson,
}: StringValueEditorProps) {
	const isJson =
		isJsonString(value) &&
		(value.startsWith("{") || value.startsWith("["));

	if (isEditing) {
		return (
			<div className="flex items-center gap-2 p-4">
				<Input
					value={editingValue}
					onChange={(e) => onEditChange(e.target.value)}
					autoFocus
					className="flex-1 font-mono"
				/>
				<Button variant="ghost" size="sm" onClick={onSave}>
					<Check className="h-4 w-4 text-green-500" />
				</Button>
				<Button variant="ghost" size="sm" onClick={onCancel}>
					<X className="h-4 w-4 text-red-500" />
				</Button>
			</div>
		);
	}

	if (isJson && onEditJson) {
		return (
			<div className="p-4 bg-muted rounded-md">
				<div className="flex justify-between items-start mb-2">
					<div className="font-medium">JSON Value</div>
					<Button
						variant="outline"
						size="sm"
						onClick={() => onEditJson(value)}
					>
						<Edit className="h-3 w-3 mr-1" />
						Edit JSON
					</Button>
				</div>
				<div className="bg-background p-2 rounded border font-mono text-sm overflow-hidden">
					{value.length > 100 ? `${value.substring(0, 100)}...` : value}
				</div>
			</div>
		);
	}

	return (
		<div className="p-4 bg-muted rounded-md">
			<div className="flex justify-between items-start">
				<div className="overflow-auto max-h-96 font-mono text-sm">{value}</div>
				<Button variant="ghost" size="sm" onClick={onEditStart}>
					<Edit className="h-4 w-4" />
				</Button>
			</div>
		</div>
	);
}

interface HashValueEditorProps {
	value: Record<string, unknown>;
	editingField: string | null;
	editingValue: string;
	onEditStart: (field: string, value: string) => void;
	onEditChange: (value: string) => void;
	onSave: () => void;
	onCancel: () => void;
	onEditJson?: (field: string, value: string) => void;
}

/**
 * Editor for hash type Redis values
 */
export function HashValueEditor({
	value,
	editingField,
	editingValue,
	onEditStart,
	onEditChange,
	onSave,
	onCancel,
	onEditJson,
}: HashValueEditorProps) {
	const entries = Object.entries(value);

	if (entries.length === 0) {
		return (
			<div className="p-4 text-center text-muted-foreground">
				Empty hash
			</div>
		);
	}

	return (
		<div className="divide-y">
			{entries.map(([field, fieldValue]) => {
				const stringValue = String(fieldValue);
				const isEditing = editingField === field;
				const isJson =
					isJsonString(stringValue) &&
					(stringValue.startsWith("{") || stringValue.startsWith("["));

				return (
					<div key={field} className="p-3 hover:bg-muted/50">
						<div className="flex items-start gap-2">
							<div className="font-medium text-sm min-w-[120px] text-muted-foreground">
								{field}
							</div>
							<div className="flex-1">
								{isEditing ? (
									<div className="flex items-center gap-2">
										<Input
											value={editingValue}
											onChange={(e) => onEditChange(e.target.value)}
											autoFocus
											className="flex-1 font-mono text-sm"
										/>
										<Button variant="ghost" size="sm" onClick={onSave}>
											<Check className="h-4 w-4 text-green-500" />
										</Button>
										<Button variant="ghost" size="sm" onClick={onCancel}>
											<X className="h-4 w-4 text-red-500" />
										</Button>
									</div>
								) : (
									<div className="flex items-start justify-between">
										<div className="font-mono text-sm break-all">
											{stringValue.length > 200
												? `${stringValue.substring(0, 200)}...`
												: stringValue}
										</div>
										<div className="flex gap-1 ml-2">
											{isJson && onEditJson && (
												<Button
													variant="ghost"
													size="sm"
													onClick={() => onEditJson(field, stringValue)}
												>
													<Edit className="h-3 w-3" />
												</Button>
											)}
											<Button
												variant="ghost"
												size="sm"
												onClick={() => onEditStart(field, stringValue)}
											>
												<Edit className="h-3 w-3" />
											</Button>
										</div>
									</div>
								)}
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
}

interface ListValueViewerProps {
	value: unknown[];
}

/**
 * Viewer for list type Redis values
 */
export function ListValueViewer({ value }: ListValueViewerProps) {
	if (value.length === 0) {
		return (
			<div className="p-4 text-center text-muted-foreground">Empty list</div>
		);
	}

	return (
		<div className="divide-y">
			{value.map((item, index) => (
				<div
					key={index}
					className="p-3 hover:bg-muted/50 flex items-start gap-2"
				>
					<span className="text-muted-foreground text-sm min-w-[40px]">
						[{index}]
					</span>
					<span className="font-mono text-sm break-all">{String(item)}</span>
				</div>
			))}
		</div>
	);
}

interface SetValueViewerProps {
	value: unknown[];
}

/**
 * Viewer for set type Redis values
 */
export function SetValueViewer({ value }: SetValueViewerProps) {
	if (value.length === 0) {
		return (
			<div className="p-4 text-center text-muted-foreground">Empty set</div>
		);
	}

	return (
		<div className="flex flex-wrap gap-2 p-4">
			{value.map((item, index) => (
				<Badge key={index} variant="secondary" className="font-mono">
					{String(item)}
				</Badge>
			))}
		</div>
	);
}

interface KeyValueEditorProps {
	keyName: string | null;
	keyInfo: KeyInfo | null;
	keyValue: KeyValue | null;
	editingField: string | null;
	editingValue: string;
	onEditStart: (field: string, value: string) => void;
	onEditChange: (value: string) => void;
	onSave: () => void;
	onCancel: () => void;
	onEditJson?: (field: string, value: string) => void;
}

/**
 * Main component for displaying and editing Redis key values
 */
export function KeyValueEditor({
	keyName,
	keyInfo,
	keyValue,
	editingField,
	editingValue,
	onEditStart,
	onEditChange,
	onSave,
	onCancel,
	onEditJson,
}: KeyValueEditorProps) {
	if (!keyName || !keyInfo || !keyValue) {
		return (
			<Card className="h-full flex items-center justify-center">
				<CardContent className="text-center text-muted-foreground">
					<p>Select a key to view its value</p>
				</CardContent>
			</Card>
		);
	}

	const renderValue = () => {
		const { type, value } = keyValue;

		switch (type.toLowerCase()) {
			case "string":
				return (
					<StringValueEditor
						value={String(value)}
						isEditing={editingField === ""}
						editingValue={editingValue}
						onEditStart={() => onEditStart("", String(value))}
						onEditChange={onEditChange}
						onSave={onSave}
						onCancel={onCancel}
						onEditJson={onEditJson ? (v) => onEditJson("", v) : undefined}
					/>
				);
			case "hash":
				return (
					<HashValueEditor
						value={value as Record<string, unknown>}
						editingField={editingField}
						editingValue={editingValue}
						onEditStart={onEditStart}
						onEditChange={onEditChange}
						onSave={onSave}
						onCancel={onCancel}
						onEditJson={onEditJson}
					/>
				);
			case "list":
				return <ListValueViewer value={value as unknown[]} />;
			case "set":
				return <SetValueViewer value={value as unknown[]} />;
			default:
				return (
					<div className="p-4 bg-muted rounded-md font-mono text-sm">
						{JSON.stringify(value, null, 2)}
					</div>
				);
		}
	};

	return (
		<Card className="h-full flex flex-col">
			<KeyInfoPanel keyName={keyName} keyInfo={keyInfo} />
			<CardContent className="flex-1 overflow-auto p-0">
				{renderValue()}
			</CardContent>
		</Card>
	);
}
