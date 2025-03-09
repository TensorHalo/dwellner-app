import React from 'react';
import { 
    View, 
    ScrollView, 
    TouchableOpacity, 
    Text,
    StyleSheet,
    Dimensions
} from 'react-native';
import { Building2, Users, Palmtree } from 'lucide-react-native';

interface PresetPromptsProps {
    onPromptSelect: (prompt: string) => void;
    visible: boolean;
    bottomPadding?: number;
}

const PROMPTS = [
    {
        id: '1',
        text: 'I am looking to rent a 1B1B condo in Toronto, close to Starbucks and UofT, with large windows.',
        Icon: Building2
    },
    {
        id: '2',
        text: 'Find a 3B2B townhouse in Vancouver, close to day-care',
        Icon: Users
    },
    {
        id: '3',
        text: 'I would like to buy a 2B2B condo in DT Toronto with lake view',
        Icon: Palmtree
    }
];

const PresetPrompts: React.FC<PresetPromptsProps> = ({ onPromptSelect, visible, bottomPadding = 80 }) => {
    if (!visible) return null;

    // Calculate container position to account for the footer
    const containerStyle = [
        styles.container,
        { marginBottom: bottomPadding }
    ];

    return (
        <View style={containerStyle}>
            <ScrollView 
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {PROMPTS.map((prompt) => (
                    <TouchableOpacity
                        key={prompt.id}
                        style={styles.promptButton}
                        onPress={() => onPromptSelect(prompt.text)}
                    >
                        <View style={styles.contentContainer}>
                            <View style={styles.iconContainer}>
                                <prompt.Icon size={24} color="#666666" style={styles.icon} />
                            </View>
                            <View style={styles.textContainer}>
                                <Text style={styles.promptText} numberOfLines={3}>
                                    {prompt.text}
                                </Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        paddingVertical: 70,
    },
    scrollContent: {
        paddingHorizontal: 16,
        gap: 12,
    },
    promptButton: {
        backgroundColor: '#f8f9fa',
        borderRadius: 20,
        width: Dimensions.get('window').width * 0.75,
        height: 120,
        marginRight: 8,
        padding: 16,
        justifyContent: 'center',
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 12,
    },
    icon: {
        opacity: 0.7,
    },
    textContainer: {
        paddingHorizontal: 4,
    },
    promptText: {
        fontSize: 15,
        color: '#000',
        lineHeight: 20,
        textAlign: 'center',
    },
});

export default PresetPrompts;