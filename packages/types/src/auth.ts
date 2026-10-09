/** The signed-in person, as returned by the API. Never contains credentials. */
export interface AccountUser {
  id: string
  email: string
  displayName: string
  createdAt: string
}
