export interface ILogin {
  email: string | null
  password: string | null
}

export interface IRegister {
  email: string | null
  firstName: string | null
  lastName: string | null
  password: string | null
}

export interface IUserInfo {
  email: string | null
  firstName: string | null
  lastName: string | null
  token: string | null
}

export interface IProfileInfo {
  email: string | null
  firstName: string | null
  lastName: string | null
}
