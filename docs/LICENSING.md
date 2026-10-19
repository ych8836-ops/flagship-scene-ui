# Licensing — version 0.1.3

Original Flagship Scene UI code is licensed under the **GNU Affero General Public License version 3 only**, SPDX identifier `AGPL-3.0-only`. This is not an MIT/AGPL dual-license offer and does not automatically select future AGPL versions. The complete, unmodified GNU text is in [LICENSE](../LICENSE); copyright and scope notices are in [NOTICE](../NOTICE).

## Scope

The project license applies to original studio UI, project/scene orchestration, SDK service, camera adapters, original registration wrappers, setup tools and original documentation. An explicit third-party notice or adjacent license takes precedence for that third-party material. The aggregate source ZIP does not replace component licenses with one blanket license.

- `custom_nodes/ComfyUI-RTX-Video-Restoration` retains its existing Apache-2.0 license and notices unchanged.
- Upstream FaceRefine material retains the MIT notice in `integrations/face_refine/UPSTREAM_LICENSE`. Original Flagship additions are distinguished from the upstream source in [third-party notices](../THIRD_PARTY_NOTICES.md).
- Dependencies retain their publishers' terms, including MIT/Apache/BSD/OFL notices. Dependency license fields in `package-lock.json` have not been changed.
- Models, LoRAs, proprietary NVIDIA runtimes, user media and independently installed external node packs are not licensed by the Flagship project license. They are not included in this source distribution.

## What the AGPL means here

Copying, modification and commercial use are permitted subject to the license. When conveying covered software, comply with its corresponding-source, license and notice requirements. Under section 13, a modified version that supports remote network interaction must prominently offer interacting users access to that version's Corresponding Source, at no charge through a standard way of copying software. A public repository link should identify the actual version being run, including changes; a link only to unrelated or unmodified upstream source is not a substitute.

AGPL is not a prohibition on forks, competing products, paid services or commercial use. It also does not automatically place every separate dependency or user-created output under AGPL. The full license controls over this summary.

The corresponding release source is published at https://github.com/ych8836-ops/flagship-scene-ui and in the source-only release ZIP. Distributors and modified-service operators remain responsible for providing the source and notices required for their own version.

## Earlier MIT versions

Versions 0.1.0 through 0.1.2 were published with original Flagship code under MIT. The last such main-branch commit is [`e4adcb4adff8cb8d84e2473cb9195a7172eb1ee7`](https://github.com/ych8836-ops/flagship-scene-ui/tree/e4adcb4adff8cb8d84e2473cb9195a7172eb1ee7). This change does not revoke previously granted MIT permissions or rewrite historical commits, archives or third-party licenses. New modifications released under AGPL are governed by their applicable terms; the historical MIT grant is not a blanket MIT grant for future additions.

## 한국어 안내

- 0.1.3부터 자체 코드의 라이선스는 **AGPL-3.0-only**입니다. MIT와의 이중 라이선스가 아닙니다.
- 복사·수정·상업적 이용 자체를 금지하지 않습니다. 배포 및 수정 웹서비스 운영 시 해당 버전에 필요한 소스 제공·고지 의무를 지켜야 합니다.
- 외부 코드의 MIT·Apache-2.0 등은 그대로 유지됩니다. 모델과 NVIDIA 런타임의 이용 조건도 별도입니다.
- 이미 MIT로 공개한 0.1.0~0.1.2의 권한을 소급하여 취소하지 않습니다. 원본 Comfy 설치와 과거 배포 ZIP도 변경하지 않습니다.
- 법적 조건은 루트 `LICENSE`의 영어 원문을 기준으로 확인하세요.
