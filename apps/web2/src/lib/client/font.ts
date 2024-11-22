export const loadFont = (fontName: string) => {
    switch (fontName) {
        case "spectral":
            document.documentElement.style.fontFamily = "Spectral";
            break;
        case "lato":
            document.documentElement.style.fontFamily = "Lato";
            break;
    }
};

export const toggleFont = () => {
    const currentFont = document.documentElement.style.fontFamily;
    if (currentFont === "Spectral") {
        document.documentElement.style.fontFamily = "Lato";
    } else {
        document.documentElement.style.fontFamily = "Spectral";
    }
};
