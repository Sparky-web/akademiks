import { Favourite } from "~/types/schedule";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { User } from "~/types/user";

const state = {
  user: null as User | null,
};

const userSlice = createSlice({
  name: "user",
  initialState: state,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
    addFavourite: (state, action: PayloadAction<Favourite>) => {
      if (!state.user) return;

      state.user.Favourites.push(action.payload);
    },
    removeFavourite: (state, action: PayloadAction<{ id: string }>) => {
      if (!state.user) return;

      state.user.Favourites = state.user.Favourites.filter(
        (e) => e.id !== action.payload.id,
      );
    },
  },
});

export const { setUser, addFavourite, removeFavourite } = userSlice.actions;

export default userSlice.reducer;
