using HabitTracker.Api.Entities;
using HabitTracker.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace HabitTracker.Api.Data;

public class HabitTrackerDbContext : DbContext
{
    // Fixed timestamp for seeded rows: EF requires seed data to be deterministic.
    private static readonly DateTimeOffset SeedTimestamp =
        new(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);

    public HabitTrackerDbContext(DbContextOptions<HabitTrackerDbContext> options)
        : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Habit> Habits => Set<Habit>();
    public DbSet<Entry> Entries => Set<Entry>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(user =>
        {
            user.HasKey(u => u.Id);
            user.Property(u => u.Name).HasMaxLength(120);
        });

        modelBuilder.Entity<Habit>(habit =>
        {
            habit.HasKey(h => h.Id);
            habit.Property(h => h.Name).HasMaxLength(200).IsRequired();
            habit.Property(h => h.Polarity).HasConversion<string>().HasMaxLength(16);
            habit
                .HasOne(h => h.User)
                .WithMany(u => u.Habits)
                .HasForeignKey(h => h.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            habit.HasIndex(h => new { h.UserId, h.Position });
        });

        modelBuilder.Entity<Entry>(entry =>
        {
            entry.HasKey(e => new { e.HabitId, e.Date });
            entry.Property(e => e.Outcome).HasConversion<string>().HasMaxLength(16);
            entry
                .HasOne(e => e.Habit)
                .WithMany(h => h.Entries)
                .HasForeignKey(e => e.HabitId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Seed the stub account so ownership FKs resolve before auth exists.
        // No habits are seeded — new users start empty (see ADR 0001).
        modelBuilder.Entity<User>().HasData(
            new User
            {
                Id = CurrentUser.StubUserId,
                Name = "Stub User",
                CreatedAt = SeedTimestamp,
                UpdatedAt = SeedTimestamp,
            }
        );
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        StampTimestamps();
        return base.SaveChangesAsync(cancellationToken);
    }

    public override int SaveChanges()
    {
        StampTimestamps();
        return base.SaveChanges();
    }

    private void StampTimestamps()
    {
        var now = DateTimeOffset.UtcNow;

        foreach (var entry in ChangeTracker.Entries<ITimestamped>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAt = now;
            }

            if (entry.State is EntityState.Added or EntityState.Modified)
            {
                entry.Entity.UpdatedAt = now;
            }
        }
    }
}
