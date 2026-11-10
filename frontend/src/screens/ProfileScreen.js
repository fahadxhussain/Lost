import React, { useState } from "react";
import { Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { Button, ErrorNotice, Icon, Notice, Screen, s } from "../components/ui";
import { errorMessage } from "../services/api";

export default function ProfileScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const [error, setError] = useState("");
  return (
    <Screen>
      <View style={[s.card, s.row]}>
        <Icon name="person-circle-outline" size={56} />
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={s.heading}>{user.name}</Text>
          <Text style={s.body}>CUI · Student</Text>
        </View>
      </View>
      <Notice title="Verified campus email">{user.email}</Notice>
      <Text style={s.eyebrow}>CONTACT DETAILS</Text>
      <View style={[s.card, { padding: 18, gap: 12 }]}>
        <Text style={s.body}>{user.email}</Text>
        {user.rollNumber && <Text style={s.body}>{user.rollNumber}</Text>}
      </View>
      <Text style={s.eyebrow}>YOUR CAMPUS</Text>
      <Button
        title="Messages"
        secondary
        onPress={() => navigation.navigate("Conversations")}
      />
      <Button
        title="Notifications"
        onPress={() => navigation.navigate("Notifications")}
      />
      <Button
        title="My reports"
        onPress={() => navigation.navigate("MyItems")}
      />
      <Notice title="Privacy & safety">
        Use in-app messages to compare identifying details. Meet in a public
        place on campus. Only mark an item resolved when the return is complete.
      </Notice>
      <ErrorNotice message={error} />
      <Button
        title="Sign out"
        onPress={async () => {
          try {
            await signOut();
          } catch (err) {
            setError(errorMessage(err));
          }
        }}
      />
    </Screen>
  );
}
