import {
  Container,
  Head,
  Heading,
  Html,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

export function PasswordResetEmail({
  code,
  expires,
}: {
  code: string;
  expires: Date;
}) {
  const minutesRemaining = Math.floor(
    (+expires - Date.now()) / (60 * 1000),
  );

  return (
    <Html>
      <Tailwind>
        <Head />
        <Container className="container px-20 font-sans">
          <Heading className="text-xl font-bold mb-4">
            Reset your password
          </Heading>
          <Text className="text-sm">
            Please enter the following code to reset your password.
          </Text>
          <Section className="text-center">
            <Text className="font-semibold">Reset code</Text>
            <Text className="font-bold text-4xl">{code}</Text>
            <Text>(This code is valid for {minutesRemaining} minutes)</Text>
          </Section>
        </Container>
      </Tailwind>
    </Html>
  );
}
