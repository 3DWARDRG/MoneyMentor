// store/useUserForm.ts
import { Database } from '@nozbe/watermelondb';
import { create } from 'zustand';


type UserForm = {
    name: string;
    email: string;
    last_name: string;
    password: string;
    confirmPassword: string;

    setField: (key: string, value: string) => void;
    reset: () => void;
};

export const useUserForm = create<UserForm>((set) => ({
  name: '',
  last_name: '',
  email: '',
  password: '',
confirmPassword: '',

  setField: (key, value) =>
    set({ [key]: value }),

  reset: () =>
    set({
  name: '',
  last_name: '',
  email: '',
  password: '',
  confirmPassword: ''
    }),
}));
