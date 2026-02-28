# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - heading "Accept Invitation" [level=1] [ref=e5]
      - paragraph [ref=e6]: Join an Arcus Smart Home
    - generic [ref=e8]:
      - paragraph [ref=e9]: Enter the invitation code from your email to get started.
      - generic [ref=e10]:
        - generic [ref=e11]: Invitation Code
        - textbox "Invitation Code" [ref=e12]:
          - /placeholder: Enter code
      - generic [ref=e13]:
        - generic [ref=e14]: Email Address
        - textbox "Email Address" [ref=e15]:
          - /placeholder: Email used for invitation
      - button "Look Up Invitation" [disabled] [ref=e16]
    - paragraph [ref=e17]:
      - text: Already have an account?
      - link "Log in" [ref=e18] [cursor=pointer]:
        - /url: /login
  - button "Open Next.js Dev Tools" [ref=e24] [cursor=pointer]:
    - img [ref=e25]
  - alert [ref=e28]
```