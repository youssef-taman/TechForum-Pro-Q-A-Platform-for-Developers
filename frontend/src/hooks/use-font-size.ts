import {useEffect, useState} from "react";

export type FontSize = "sm" | "md" | "lg" | "xl";

const FONT_SIZE_KEY = "tf_font_size";

export function useFontSize() {
    const [size, setSize] = useState<FontSize>(
        () => (localStorage.getItem(FONT_SIZE_KEY) as FontSize) ?? "md",
    );

    useEffect(() => {
        document.documentElement.setAttribute("data-font-size", size);
        localStorage.setItem(FONT_SIZE_KEY, size);
    }, [size]);

    return {size, setSize};
}
