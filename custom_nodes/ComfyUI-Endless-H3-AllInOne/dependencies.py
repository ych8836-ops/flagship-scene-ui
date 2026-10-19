"""Feature-scoped dependency diagnostics; never install or download during generation."""
PACKS = {
    'EndlessH3StitchScene': ('ComfyUI-Endless-H3-AllInOne', None),
    'EndlessH3ConcatScenes': ('ComfyUI-Endless-H3-AllInOne', None),
    'H3MotionContextClipStitcher -noEmbryo': ('noEmbryo', 'https://github.com/noembryo/ComfyUI-noEmbryo'),
    'FlagshipCameraProtectProps': ('ComfyUI-Flagship-Camera-Guide', None),
    'FlagshipCrossViewGuide': ('ComfyUI-Flagship-Camera-Guide', None),
    'FlagshipCameraOrbitEligibility': ('ComfyUI-Flagship-Camera-Guide', None),
    'FlagshipCameraMotionEligibility': ('ComfyUI-Flagship-Camera-Guide', None),
    'FlagshipCameraMotionViews': ('ComfyUI-Flagship-Camera-Guide', None),
    'FlagshipCameraWideComposite': ('ComfyUI-Flagship-Camera-Guide', None),
    'H3FaceTrackCrop': ('ComfyUI-H3-FaceRefine', None),
    'H3R2VCameraTimeline': ('ComfyUI-H3-R2V-CameraLipLock', None),
    'H3CameraExactAudioLock': ('ComfyUI-H3-R2V-CameraLipLock', None),
    'FlagshipPrepareCameraGeometry': ('ComfyUI-Flagship-Camera-Guide', None),
    'FlagshipGeometryCamera': ('ComfyUI-Flagship-Camera-Guide', None),
    'FlagshipDepthRackFocus': ('ComfyUI-Flagship-Camera-Guide', None),
    'FlagshipCameraLipRepairGuard': ('ComfyUI-Flagship-Camera-Guide', None),
    'FlagshipCameraLipRepairSwitch': ('ComfyUI-Flagship-Camera-Guide', None),
    'FlagshipMultiAngleGuide': ('ComfyUI-Flagship-Camera-Guide', None),
    'FlagshipMultiAngleSourceZoom': ('ComfyUI-Flagship-Camera-Guide', None),
    'FlagshipCameraVisibleTargets': ('ComfyUI-Flagship-Camera-Guide', None),
    'FlagshipCameraTargetFraming': ('ComfyUI-Flagship-Camera-Guide', None),
    'FlagshipCameraDollyLayers': ('ComfyUI-Flagship-Camera-Guide', None),
    'FlagshipCameraLayeredDolly': ('ComfyUI-Flagship-Camera-Guide', None),
    'H3InjectVideoLatent': ('ComfyUI-H3-FaceRefine', None),
    'H3FaceStitch': ('ComfyUI-H3-FaceRefine', None),
    'RTXVideoVSRRestore': ('ComfyUI-RTX-Video-Restoration', None),
    'VHS_LoadVideoFFmpeg': ('VideoHelperSuite', 'https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite'),
    'MiniMaxH3MemoryEfficientSageAttentionPatch': ('KJNodes', 'https://github.com/kijai/ComfyUI-KJNodes'),
    'MiniMaxChunkFeedForward': ('KJNodes', 'https://github.com/kijai/ComfyUI-KJNodes'),
    'PathchSageAttentionKJ': ('KJNodes', 'https://github.com/kijai/ComfyUI-KJNodes'),
    'H3ClipRefiner -noEmbryo': ('noEmbryo', 'https://github.com/noembryo/ComfyUI-noEmbryo'),
    'SpectrumApplyMiniMaxH3': ('Spectrum', 'https://github.com/xmarre/ComfyUI-Spectrum-MiniMax-H3'),
}
FEATURES = {
    'scene_assembly': ['EndlessH3StitchScene', 'EndlessH3ConcatScenes', 'H3MotionContextClipStitcher -noEmbryo',
                       'EndlessV15MiniMaxH3MotionContextTrim', 'VAELoader'],
    'generation': ['MiniMaxH3ImageToVideo', 'MiniMaxH3ReferenceToVideo', 'SamplerCustomAdvanced',
                   'EndlessV15MiniMaxH3MotionContext', 'EndlessV15MiniMaxH3MotionContextTrim',
                   'EndlessV15MiniMaxH3MotionContextLoadLatent', 'EndlessV15MiniMaxH3MotionContextSaveLatent'],
    'camera': ['H3R2VCameraTimeline', 'H3FaceTrackCrop', 'H3CameraExactAudioLock', 'H3CameraSegmentPreview', 'VHS_LoadVideoFFmpeg'],
    'camera_guidance': ['FlagshipPrepareCameraGeometry','FlagshipGeometryCamera','FlagshipDepthRackFocus',
                        'LoadMoGeModel','MoGeInference','MiniMaxH3FunControlNetApply','ModelPatchLoader'],
    'camera_face_audio': ['FlagshipCameraProtectProps','FlagshipCameraLipRepairGuard','FlagshipCameraLipRepairSwitch','H3FaceTrackCrop',
                        'H3InjectVideoLatent','H3FaceStitch','VAEEncodeAudio','SetLatentNoiseMask','LTXVConcatAVLatent'],
    'camera_quick_angles': ['FlagshipMultiAngle','FlagshipMultiAngleGuide','FlagshipMultiAngleSourceZoom'],
    'camera_measured_framing': ['FlagshipCameraVisibleTargets','FlagshipCameraTargetFraming'],
    'camera_layered_dolly': ['FlagshipCameraDollyLayers','FlagshipCameraLayeredDolly','LoadMoGeModel','MoGeInference'],
    'camera_view_adapter': ['FlagshipCrossViewGuide','LoadMoGeModel','MoGeInference','MiniMaxH3AddGuide'],
    'camera_quiet_motion': ['FlagshipCameraMotionEligibility','FlagshipCameraMotionViews','FlagshipCameraWideComposite'],
    'upscale': ['RTXVideoVSRRestore'],
    'clip_refiner': ['H3ClipRefiner -noEmbryo'],
    'spectrum': ['SpectrumApplyMiniMaxH3'],
}


def missing_graph_nodes(graph, installed):
    return sorted({node['class_type'] for node in graph.values()} - set(installed))


def describe_missing(names):
    return ', '.join(name + (' (' + PACKS[name][0] + ')' if name in PACKS else '') for name in names)


def feature_report(installed):
    result = {}
    for feature, names in FEATURES.items():
        missing = sorted(set(names) - set(installed))
        result[feature] = {'ready': not missing, 'missing': missing,
                           'install': [{'node': name, 'pack': PACKS.get(name, ('ComfyUI / context adapter', None))[0],
                                        'url': PACKS.get(name, ('', None))[1]} for name in missing]}
    return result
