using System.Text.Json.Serialization;
using HabitTracker.Api.Data;
using HabitTracker.Api.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder
    .Services.AddControllers()
    .AddJsonOptions(options =>
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter())
    );

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.AddDbContext<HabitTrackerDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("HabitTracker"))
);

// Auth is deferred: every request acts as the seeded stub user (see CurrentUser).
builder.Services.AddScoped<CurrentUser>();
builder.Services.AddScoped<HabitService>();
builder.Services.AddScoped<SyncService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
