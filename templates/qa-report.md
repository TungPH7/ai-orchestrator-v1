<!--
Template for the `qa-report` artifact in contract/policies.yaml: the QA result of one item, posted by `qa` as a comment
on the Jira item, with links to the CI artifacts. A FAIL sends the item back to in-progress through qa-fail: list the
failing criteria here instead of opening a Bug.
Keep headings in English and write the content in Vietnamese. Delete the guidance comments and the Example section when you are done.
-->

# QA report: <KEY> <item title>

## Result

<!-- PASS when every acceptance criterion passes, otherwise FAIL. -->

PASS | FAIL

## Environment

<!-- The QA environment of the item, as docs/sdlc.md routes it (development, staging or production), and its URL. -->

## Commit

<!-- The commit or tag that was deployed when you tested, and the PR it came from. -->

## Acceptance Criteria

| Acceptance criterion | Result | Evidence |
|---|---|---|
| <Given … When … Then …> | PASS / FAIL | <test name, video or trace> |

## CI Artifacts

<!-- Links to the CI run and its artifacts: E2E videos, traces, screenshots. -->

## Notes

<!-- Anything else you saw that is outside this item, or "Không có". -->

## Example

<details>
<summary>Ví dụ: báo cáo QA của Story DEMO-12</summary>

````markdown
# QA report: DEMO-12 Đăng nhập bằng email và mật khẩu

## Result
PASS

## Environment
development: https://dev.example.com

## Commit
`3f2a9c1` trên `develop`, từ PR #42.

## Acceptance Criteria
| Acceptance criterion | Result | Evidence |
|---|---|---|
| Given tài khoản đã kích hoạt, When nhập đúng email và mật khẩu, Then vào trang Đơn hàng | PASS | `login.spec.ts` › logs in with valid credentials |
| Given mật khẩu sai, When bấm Đăng nhập, Then thấy "Email hoặc mật khẩu không đúng" | PASS | `login.spec.ts` › rejects a wrong password |

## CI Artifacts
https://github.com/example/shop/actions/runs/123456 (video, trace)

## Notes
Không có.
````

</details>
