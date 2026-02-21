import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ModelCapabilities, ModelParameter } from "@/types/model";

interface ModelCapabilityFormProps {
    capabilities?: ModelCapabilities;
    values: Record<string, any>;
    onChange: (key: string, value: any) => void;
    disabled?: boolean;
}

export const ModelCapabilityForm: React.FC<ModelCapabilityFormProps> = ({
    capabilities,
    values,
    onChange,
    disabled
}) => {
    if (!capabilities?.parameters) return null;

    const renderInput = (key: string, config: ModelParameter) => {
        const value = values[key] ?? config.default;

        if (config.type === 'enum' && config.values) {
            return (
                <Select
                    onValueChange={(val) => onChange(key, val)}
                    value={String(value)}
                    disabled={disabled}
                >
                    <SelectTrigger>
                        <SelectValue placeholder={config.label} />
                    </SelectTrigger>
                    <SelectContent>
                        {config.values.map((opt) => {
                            // Use labels if provided, otherwise use the raw value
                            const displayLabel = config.labels?.[String(opt)] || String(opt);
                            return (
                                <SelectItem key={String(opt)} value={String(opt)}>
                                    {displayLabel}
                                    {key === 'duration' ? ' saniye' : ''}
                                </SelectItem>
                            );
                        })}
                    </SelectContent>
                </Select>
            );
        }

        if (config.type === 'range') {
            return (
                <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-500">
                        <span>{config.min}</span>
                        <span className="font-semibold text-gray-900">{value}</span>
                        <span>{config.max}</span>
                    </div>
                    <Input
                        type="range"
                        min={config.min}
                        max={config.max}
                        step={config.step || 1}
                        value={value}
                        onChange={(e) => onChange(key, Number(e.target.value))}
                        disabled={disabled}
                        className="w-full cursor-pointer accent-purple-600"
                    />
                </div>
            );
        }

        if (config.type === 'boolean') {
            // Simple toggle implemented with checkbox or switch-like UI
            return (
                <div className="flex items-center space-x-2 border p-3 rounded-md">
                    <input
                        type="checkbox"
                        checked={!!value}
                        onChange={(e) => onChange(key, e.target.checked)}
                        disabled={disabled}
                        className="h-4 w-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700">Etkinleştir</span>
                </div>
            );
        }

        return null;
    };

    return (
        <>
            {Object.entries(capabilities.parameters).map(([key, config]) => (
                <div key={key} className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        {config.label}
                    </label>
                    {renderInput(key, config)}
                    {config.description && (
                        <p className="text-xs text-gray-500 mt-1">{config.description}</p>
                    )}
                </div>
            ))}
        </>
    );
};
