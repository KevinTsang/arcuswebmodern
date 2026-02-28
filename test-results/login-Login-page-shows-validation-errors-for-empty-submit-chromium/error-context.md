# Page snapshot

```yaml
- generic [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e4]: Arcus
      - generic [ref=e5]: Smart Home
    - generic [ref=e7]:
      - generic [ref=e8]:
        - generic [ref=e9]: Email
        - textbox "Email" [ref=e10]
        - paragraph [ref=e11]: can't be blank
      - generic [ref=e12]:
        - generic [ref=e13]: Password
        - textbox "Password" [ref=e14]
        - paragraph [ref=e15]: can't be blank
      - generic [ref=e16]:
        - checkbox "I am on a public computer" [ref=e17]
        - generic [ref=e18]: I am on a public computer
      - generic [ref=e19]:
        - button "Login" [active] [ref=e20]
        - link "Create An Account" [ref=e21] [cursor=pointer]:
          - /url: /create-account
      - generic [ref=e22]:
        - link "Use Invitation Code" [ref=e23] [cursor=pointer]:
          - /url: /invite
        - link "Forgot Password?" [ref=e24] [cursor=pointer]:
          - /url: /login?view=send-code
  - button "Open Next.js Dev Tools" [ref=e30] [cursor=pointer]:
    - img [ref=e31]
  - alert [ref=e34]
```