import { Container, Text } from "@mantine/core";
import classes from "./Footer.module.css";

export function Footer() {
    return (
        <footer className={classes.footer}>
            <Container size="lg">
                <Text size="sm" c="dimmed" ta="center">
                    © {new Date().getFullYear()} Rebecca & Matthew
                </Text>
            </Container>
        </footer>
    );
}
