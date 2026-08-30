"use client";

export function ScheduleExportButtons({ scheduleId, month }: { scheduleId: string; month: string }) {
  async function image(format: "png" | "jpeg") {
    const response = await fetch(`/api/schedules/export?scheduleId=${scheduleId}&format=svg`);
    if (!response.ok) return alert("Export gagal. Silakan coba kembali.");
    const blob = await response.blob(), url = URL.createObjectURL(blob), picture = new Image();
    picture.onload = () => {
      const scale = 3, canvas = document.createElement("canvas");
      canvas.width = picture.naturalWidth * scale; canvas.height = picture.naturalHeight * scale;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.scale(scale, scale); context.drawImage(picture, 0, 0);
      canvas.toBlob(file => {
        if (!file) return;
        const link = document.createElement("a"); link.href = URL.createObjectURL(file); link.download = `jadwal-${month}.${format === "jpeg" ? "jpg" : "png"}`; link.click();
        URL.revokeObjectURL(link.href); URL.revokeObjectURL(url);
      }, `image/${format}`, 0.95);
    };
    picture.src = url;
  }
  function printSchedule() { window.open(`/api/schedules/export?scheduleId=${scheduleId}&format=svg`, "_blank", "noopener,noreferrer"); }
  return <div className="export-actions"><a href={`/api/schedules/export?scheduleId=${scheduleId}`}>CSV</a><a href={`/api/schedules/export?scheduleId=${scheduleId}&format=excel`}>Excel</a><button type="button" onClick={() => image("png")}>HD PNG</button><button type="button" onClick={() => image("jpeg")}>HD JPG</button><button type="button" onClick={printSchedule}>Print / PDF</button></div>;
}
