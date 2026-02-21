export interface ModelParameter {
    label: string;
    type: 'enum' | 'range' | 'boolean';
    values?: (string | number)[]; // For enum type
    min?: number; // For range type
    max?: number; // For range type
    step?: number; // For range type
    default?: string | number | boolean;
    mapping_type?: 'argument' | 'sku_switch' | 'sku_suffix';
    suffix_map?: Record<string, string>;
    sku_map?: Record<string, string>;
    labels?: Record<string, string>; // Display labels for enum values
    unit?: string; // Unit suffix to display (e.g., "saniye")
    description?: string;
    api_key?: string; // If mapping_type is argument, implies the key to send
}

export interface ModelCapabilities {
    parameters: Record<string, ModelParameter>;
}

export interface AIModel {
    id: string;
    name: string;
    provider_id: string;
    type: string;
    capabilities?: ModelCapabilities;
    description?: string;
    is_active?: boolean;
    cost_per_unit?: number;
    cost_multiplier?: number;
}
