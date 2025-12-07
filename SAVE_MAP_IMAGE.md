# How to Add the Kazakhstan Map to PDF Reports

## Quick Instructions

The PDF report generator is looking for a map image at:
```
/home/asmovelius/projects/personal/promtech-hack/public/assets/kazakhstan-pipeline-map.png
```

## Steps to Add Your Map Image:

### Option 1: Save from Screenshot (RECOMMENDED)
1. Take a screenshot of the Kazakhstan map from your application
2. Save it as `kazakhstan-pipeline-map.png`
3. Place it in: `/home/asmovelius/projects/personal/promtech-hack/public/assets/`

### Option 2: Export from Your Map Component
1. Open your application at: http://localhost:3000
2. Navigate to the map view
3. Use browser DevTools or a screenshot tool to capture the full map
4. Save as `kazakhstan-pipeline-map.png` in the assets folder

### Option 3: Use Command Line (if you have the image file)
```bash
# If you have the image somewhere else, copy it:
cp /path/to/your/map.png /home/asmovelius/projects/personal/promtech-hack/public/assets/kazakhstan-pipeline-map.png
```

## Verify It's Working

After placing the image, you can verify it's accessible by visiting:
```
http://localhost:3000/assets/kazakhstan-pipeline-map.png
```

Then test the PDF generation from the `/stats` page.

## Image Requirements
- **Format**: PNG (preferred) or JPG
- **Recommended Size**: 1200-1600px wide
- **Aspect Ratio**: Landscape orientation (wider than tall)
- **Content**: Should show full Kazakhstan with pipeline routes and markers
